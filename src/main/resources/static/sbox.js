'use strict';

const React = require('react');
const when = require('./node_modules/rest/node_modules/when'); 
const client = require('./client');

const follow = require('./follow'); // function to hop multiple links by "rel"

const stompClient = require('./websocket-listener');

const root = '/api';

class SboxApp extends React.Component {

	constructor(props) {
		super(props);
		this.state = {sboxes: [], attributes: [], page: 1, pageSize: 2, links: {}};
		this.updatePageSize = this.updatePageSize.bind(this);
		this.onCreate = this.onCreate.bind(this);
		this.onUpdate = this.onUpdate.bind(this);
		this.onDelete = this.onDelete.bind(this);
		this.onNavigate = this.onNavigate.bind(this);
		this.refreshCurrentPage = this.refreshCurrentPage.bind(this);
		this.refreshAndGoToLastPage = this.refreshAndGoToLastPage.bind(this);
	}

	loadFromServer(pageSize) {
		follow(client, root, [
				{rel: 'sboxes', params: {size: pageSize}}]
		).then(sboxCollection => {
			return client({
				method: 'GET',
				path: sboxCollection.entity._links.profile.href,
				headers: {'Accept': 'application/schema+json'}
			}).then(schema => {
				// tag::json-schema-filter[]
				/**
				 * Filter unneeded JSON Schema properties, like uri references and
				 * subtypes ($ref).
				 */
				Object.keys(schema.entity.properties).forEach(function (property) {
					if (schema.entity.properties[property].hasOwnProperty('format') &&
						schema.entity.properties[property].format === 'uri') {
						delete schema.entity.properties[property];
					}
					if (schema.entity.properties[property].hasOwnProperty('$ref')) {
						delete schema.entity.properties[property];
					}
				});

				this.schema = schema.entity;
				this.links = sboxCollection.entity._links;
				return sboxCollection;
				// end::json-schema-filter[]
			});
		}).then(sboxCollection => {
			this.page = sboxCollection.entity.page;
			return sboxCollection.entity._embedded.sboxes.map(sbox =>
					client({
						method: 'GET',
						path: sbox._links.self.href
					})
			);
		}).then(sboxPromises => {
			return when.all(sboxPromises);
		}).done(sboxes => {
			this.setState({
				page: this.page,
				sboxes: sboxes,
				attributes: Object.keys(this.schema.properties),
				pageSize: pageSize,
				links: this.links
			});
		});
	}

	// tag::on-create[]
	onCreate(newSbox) {
		follow(client, root, ['sboxes']).done(response => {
			client({
				method: 'POST',
				path: response.entity._links.self.href,
				entity: newSbox,
				headers: {'Content-Type': 'application/json'}
			})
		})
	}
	// end::on-create[]

	// tag::on-update[]
	onUpdate(sbox, updatedSbox) {
		client({
			method: 'PUT',
			path: sbox.entity._links.self.href,
			entity: updatedSbox,
			headers: {
				'Content-Type': 'application/json',
				'If-Match': sbox.headers.Etag
			}
		}).done(response => {
			/* Let the websocket handler update the state */
		}, response => {
			if (response.status.code === 403) {
				alert('ACCESS DENIED: You are not authorized to update ' +
						sbox.entity._links.self.href);
			}
			if (response.status.code === 412) {
				alert('DENIED: Unable to update ' + sbox.entity._links.self.href +
					'. Your copy is stale.');
			}
		});
	}
	// end::on-update[]

	// tag::on-delete[]
	onDelete(sbox) {
		client({method: 'DELETE', path: sbox.entity._links.self.href}
		).done(response => {/* let the websocket handle updating the UI */},
		response => {
			if (response.status.code === 403) {
				alert('ACCESS DENIED: You are not authorized to delete ' +
					employee.entity._links.self.href);
			}
		});
	}
	// end::on-delete[]

	onNavigate(navUri) {
		client({
			method: 'GET',
			path: navUri
		}).then(sboxCollection => {
			this.links = sboxCollection.entity._links;
			this.page = sboxCollection.entity.page;

			return sboxCollection.entity._embedded.sboxes.map(sbox =>
					client({
						method: 'GET',
						path: sbox._links.self.href
					})
			);
		}).then(sboxPromises => {
			return when.all(sboxPromises);
		}).done(sboxes => {
			this.setState({
				page: this.page,
				sboxes: sboxes,
				attributes: Object.keys(this.schema.properties),
				pageSize: this.state.pageSize,
				links: this.links
			});
		});
	}

	updatePageSize(pageSize) {
		if (pageSize !== this.state.pageSize) {
			this.loadFromServer(pageSize);
		}
	}

	// tag::websocket-handlers[]
	refreshAndGoToLastPage(message) {
		follow(client, root, [{
			rel: 'sboxes',
			params: {size: this.state.pageSize}
		}]).done(response => {
			if (response.entity._links.last !== undefined) {
				this.onNavigate(response.entity._links.last.href);
			} else {
				this.onNavigate(response.entity._links.self.href);
			}
		})
	}

	refreshCurrentPage(message) {
		follow(client, root, [{
			rel: 'sboxes',
			params: {
				size: this.state.pageSize,
				page: this.state.page.number
			}
		}]).then(sboxCollection => {
			this.links = sboxCollection.entity._links;
			this.page = sboxCollection.entity.page;

			return sboxCollection.entity._embedded.sboxes.map(sbox => {
				return client({
					method: 'GET',
					path: sbox._links.self.href
				})
			});
		}).then(sboxPromises => {
			return when.all(sboxPromises);
		}).then(sboxes => {
			this.setState({
				page: this.page,
				sboxes: sboxes,
				attributes: Object.keys(this.schema.properties),
				pageSize: this.state.pageSize,
				links: this.links
			});
		});
	}
	// end::websocket-handlers[]

	// tag::register-handlers[]
	componentDidMount() {
		this.loadFromServer(this.state.pageSize);
		stompClient.register([
			{route: '/topic/newSbox', callback: this.refreshAndGoToLastPage},
			{route: '/topic/updateSbox', callback: this.refreshCurrentPage},
			{route: '/topic/deleteSbox', callback: this.refreshCurrentPage}
		]);
	}
	// end::register-handlers[]

	render() {
		return (
			<div>
			<SboxCreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
			<SboxList page={this.state.page}
							  sboxes={this.state.sboxes}
							  links={this.state.links}
							  pageSize={this.state.pageSize}
							  attributes={this.state.attributes}
							  onNavigate={this.onNavigate}
							  onUpdate={this.onUpdate}
							  onDelete={this.onDelete}
							  updatePageSize={this.updatePageSize}/>
			</div>
		)
	}
}

class SboxCreateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		var newSbox = {};
		var input;
		this.props.attributes.forEach(attribute => {
			if (!this.refs[attribute]) input = '';
			else{				
				input = React.findDOMNode(this.refs[attribute]).value.trim();
				if (attribute == "anynomous") input = (input == "on" ? true:false)
			}

			newSbox[attribute] = input;
			
		});
		this.props.onCreate(newSbox);
		this.props.attributes.forEach(attribute => {
			React.findDOMNode(this.refs[attribute]).value = ''; // clear out the dialog's inputs
		});
		window.location = "#";
	}

	render() {
		
		
		var attributes = this.props.attributes;
		
		var input_fields = [];
		//if ("first" in this.props.links) {
		input_fields .push(<label for="description"> Description</label>);
			input_fields .push(<input type="text" placeholder="description" ref="description" className="field"/>);
			input_fields .push(<label for="anynomous"> Anynomous</label>);
			input_fields .push(<input type="checkbox" placeholder="anynomous" ref="anynomous" className="field"/>);
		//}
		var inputs = this.props.attributes.map(attribute =>
				<p key={attribute}>
					<input type="text" placeholder={attribute} ref={attribute} className="field" />
				</p>
		);
		return (
				<div>
				<a href="#createSbox" className="btn btn-primary">Create</a>

				<div id="createSbox" className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Create new suggestion</h2>

						<form>
							{input_fields}
							<button onClick={this.handleSubmit}>Create</button>
						</form>
					</div>
				</div>
			</div>	
		)
	}
}

class SboxUpdateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		var updatedSbox = {};
		this.props.attributes.forEach(attribute => {
			updatedSbox[attribute] = React.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onUpdate(this.props.sbox, updatedSbox);
		window.location = "#";
	}

	render() {
		
		var inputs = this.props.attributes.map(attribute =>
				<p key={this.props.sbox.entity[attribute]}>
					<input type="text" placeholder={attribute}
						   defaultValue={this.props.sbox.entity[attribute]}
						   ref={attribute} className="field" />
				</p>
		);

		var dialogId = "updateSbox-" + this.props.sbox.entity._links.self.href;

		return (
			<div>
				<a href={"#" + dialogId} className="btn btn-info">Update</a>

				<div id={dialogId} className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Update an Sugestion box</h2>

						<form>
							{inputs}
							<button onClick={this.handleSubmit}>Update</button>
						</form>
					</div>
				</div>
			</div>
		)
	}

}

class SboxList extends React.Component {

	constructor(props) {
		super(props);
		this.handleNavFirst = this.handleNavFirst.bind(this);
		this.handleNavPrev = this.handleNavPrev.bind(this);
		this.handleNavNext = this.handleNavNext.bind(this);
		this.handleNavLast = this.handleNavLast.bind(this);
		this.handleInput = this.handleInput.bind(this);
	}

	handleInput(e) {
		e.preventDefault();
		var pageSize = React.findDOMNode(this.refs.pageSize).value;
		if (/^[0-9]+$/.test(pageSize)) {
			this.props.updatePageSize(pageSize);
		} else {
			React.findDOMNode(this.refs.pageSize).value = pageSize.substring(0, pageSize.length - 1);
		}
	}

	handleNavFirst(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.first.href);
	}

	handleNavPrev(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.prev.href);
	}

	handleNavNext(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.next.href);
	}

	handleNavLast(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.last.href);
	}

	render() {
		var pageInfo = this.props.page.hasOwnProperty("number") ?
			<h3>Sugestion Box - Page {this.props.page.number + 1} of {this.props.page.totalPages}</h3> : null;

		var sboxes = this.props.sboxes.map(sbox =>
			<Sbox key={sbox.entity._links.self.href}
			sbox={sbox}
					  attributes={this.props.attributes}
					  onUpdate={this.props.onUpdate}
					  onDelete={this.props.onDelete}/>
		);

		var navLinks = [];
		if ("first" in this.props.links) {
			navLinks.push(<button key="first" onClick={this.handleNavFirst} className="btn">&lt;&lt;</button>);
		}
		if ("prev" in this.props.links) {
			navLinks.push(<button key="prev" onClick={this.handleNavPrev} className="btn">&lt;</button>);
		}
		if ("next" in this.props.links) {
			navLinks.push(<button key="next" onClick={this.handleNavNext} className="btn">&gt;</button>);
		}
		if ("last" in this.props.links) {
			navLinks.push(<button key="last" onClick={this.handleNavLast} className="btn">&gt;&gt;</button>);
		}

		return (
			<div>
				{pageInfo}
				<input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
				{navLinks}
				<table className="table table-striped table-bordered table-condensed table-responsive table-hover">
				<thead>
					<tr>
						<th>Created Date</th>
						<th>Description</th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
					</thead>
					<tbody>
					{sboxes}
					</tbody>
				</table>
			</div>
		)
	}
}

// tag::employee[]
class Sbox extends React.Component {

	constructor(props) {
		super(props);
		this.handleDelete = this.handleDelete.bind(this);
	}

	handleDelete() {
		this.props.onDelete(this.props.sbox);
	}

	render() {
		return (
			<tr>
				<td>{this.props.sbox.entity.createdDate}</td>
				<td>{this.props.sbox.entity.description}</td>
				<td></td>
				<td>
				<SboxUpdateDialog sbox={this.props.sbox}
				  attributes={this.props.attributes}
				  onUpdate={this.props.onUpdate}/>
				</td>
				<td>
					<button onClick={this.handleDelete} className="btn btn-warning">Delete</button>
				</td>
			</tr>
		)
	}
}
// end::employee[]

React.render(
	<SboxApp />,
	document.getElementById('react')
)

